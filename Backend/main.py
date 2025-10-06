import os
import io
import json
from fastapi import FastAPI, HTTPException, Response, Query, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageDraw, ImageFont
from typing import List
import logging

# --- New Imports ---
from dotenv import load_dotenv
import psycopg2
from psycopg2.pool import SimpleConnectionPool
import time
# --------------------

# Simple in-memory cache for labels
label_cache = {}
CACHE_EXPIRY = 300  # 5 minutes
app = FastAPI()

# --- Logging Setup ---
logging.basicConfig(level=logging.DEBUG)  # Set to DEBUG for detailed output
logger = logging.getLogger(__name__)

# --- Load environment variables from .env file ---
load_dotenv()
# --------------------------------------------------------

# --- Configuration ---
TILESETS_DIR = "./tiles"

# --- Neon DB Configuration ---
DATABASE_URL = os.environ.get("DATABASE_URL")
logger.info(f"🔍 DATABASE_URL found: {'Yes' if DATABASE_URL else 'No'}")
if DATABASE_URL:
    logger.info(f"🔗 DATABASE_URL starts with: {DATABASE_URL[:20]}...")

db_pool = None
if DATABASE_URL:
    try:
        db_pool = SimpleConnectionPool(5, 50, dsn=DATABASE_URL)  # Increased pool size
        logger.info("✅ Connected to Neon PostgreSQL pool (5-50 connections)")
    except Exception as e:
        logger.error(f"⚠️ Failed to connect to Neon PostgreSQL: {str(e)}")
else:
    logger.warning("⚠️ DATABASE_URL not found in environment variables. The /tile-label endpoint will not work.")
# -----------------------------

# GCS Client Initialization
try:
    from google.cloud import storage
    BUCKET_NAME = 'n-large'
    YOUR_PROJECT_ID = 'gen-lang-client-0849924728'
    storage_client = storage.Client(project=YOUR_PROJECT_ID)
    bucket = storage_client.bucket(BUCKET_NAME)
    list(bucket.list_blobs(max_results=1))
    logger.info(f"✅ Connected to GCS bucket: gs://{bucket.name}")
except Exception as e:
    logger.error(f"⚠️ GCS not available ({str(e)[:100]}...). API might not function correctly.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Endpoints ---
@app.get("/info/{image_set}")
async def get_image_info(image_set: str):
    """
    Fetch config.json directly via HTTP since bucket is public
    """
    import requests
    
    config_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{image_set}/config.json"
    
    try:
        response = requests.get(config_url)
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Image configuration not found.")
        
        response.raise_for_status()  # Raise exception for other HTTP errors
        config_data = response.json()
        
        # Add direct GCS URL for tiles
        config_data['tileSourceUrl'] = f"https://storage.googleapis.com/{BUCKET_NAME}/{image_set}"
        
        return config_data
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch config: {str(e)}")


@app.get("/tiles/{image_set}/{z}/{x}/{y}.png")
async def get_tile(image_set: str, z: int, x: int, y: int):
    """
    Proxy tiles from public GCS bucket via HTTP
    """
    import requests
    
    tile_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{image_set}/{z}/{x}/{y}.png"
    
    try:
        response = requests.get(tile_url)
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Tile not found")
        
        response.raise_for_status()
        return Response(content=response.content, media_type="image/png")
        
    except requests.RequestException:
        raise HTTPException(status_code=404, detail="Tile not found")


@app.get("/tiles-debug/{image_set}/{z}/{x}/{y}.png")
async def get_tile_debug(image_set: str, z: int, x: int, y: int):
    """
    Fetch tile from public GCS bucket via HTTP and add debug overlay
    """
    import requests
    
    tile_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{image_set}/{z}/{x}/{y}.png"
    
    try:
        response = requests.get(tile_url)
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Tile not found")
        
        response.raise_for_status()
        img = Image.open(io.BytesIO(response.content))
        
        # Add debug overlay
        draw = ImageDraw.Draw(img)
        debug_text = f"Level: {z}\nCol (x): {x}\nRow (y): {y}"
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except IOError:
            font = ImageFont.load_default()
        draw.rectangle([0, 0, img.width - 1, img.height - 1], outline="lime", width=2)
        draw.text((10, 10), debug_text, fill="white", font=font)
        
        final_image_buffer = io.BytesIO()
        img.save(final_image_buffer, format="PNG")
        final_image_buffer.seek(0)
        return Response(content=final_image_buffer.getvalue(), media_type="image/png")
        
    except requests.RequestException:
        raise HTTPException(status_code=404, detail="Tile not found")

@app.get("/")
def read_root():
    return {"message": "NASA Image Tile Server is running"}

@app.get("/tile-label")
async def get_tile_label(file_path: str = Query(..., description="Full GCS file path of the tile")):
    """
    Returns the label/value for the given tile file path by querying the Neon PostgreSQL DB.
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database service is not configured.")

    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT value FROM nlarge WHERE file_path = %s", (file_path,))
        result = cur.fetchone()
        cur.close()

        if result:
            value = result[0]
            return {"file_path": file_path, "value": value}
        else:
            raise HTTPException(status_code=404, detail="No label found for this tile")
    except Exception as e:
        logger.error(f"❌ Database query failed: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while querying the database.")
    finally:
        if conn is not None:
            db_pool.putconn(conn)

@app.post("/batch-tile-labels")
async def get_batch_tile_labels(request: dict = Body(...)):
    """
    Fast batch endpoint with caching for tile labels.
    """
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database service is not configured.")
    
    # Extract file_paths from request body
    file_paths = request.get("file_paths", [])
    
    if not file_paths:
        return {}
    
    current_time = time.time()
    response = {}
    uncached_paths = []
    
    # Check cache first
    for path in file_paths:
        if path in label_cache:
            cache_entry = label_cache[path]
            if current_time - cache_entry['timestamp'] < CACHE_EXPIRY:
                if cache_entry['value'] is not None:
                    response[path] = cache_entry['value']
                continue
        uncached_paths.append(path)
    
    # Query database only for uncached paths
    if uncached_paths:
        conn = db_pool.getconn()
        try:
            cur = conn.cursor()
            # Use ANY() for better performance with large lists
            cur.execute("SELECT file_path, value FROM nlarge WHERE file_path = ANY(%s)", (uncached_paths,))
            results = cur.fetchall()
            cur.close()
            
            # Update cache and response
            for row in results:
                file_path, value = row
                label_cache[file_path] = {'value': value, 'timestamp': current_time}
                response[file_path] = value
            
            # Cache misses (paths not found in DB)
            found_paths = {row[0] for row in results}
            for path in uncached_paths:
                if path not in found_paths:
                    label_cache[path] = {'value': None, 'timestamp': current_time}
                    
        except Exception as e:
            logger.error(f"❌ Batch database query failed: {e}")
            raise HTTPException(status_code=500, detail="Database error")
        finally:
            if conn is not None:
                db_pool.putconn(conn)
    
    logger.info(f"📊 Batch request: {len(file_paths)} requested, {len(response)} found, {len(uncached_paths)} from DB")
    return response