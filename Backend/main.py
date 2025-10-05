import os
import io
import json
from fastapi import FastAPI, HTTPException, Response, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageDraw, ImageFont

# --- New Imports ---
from dotenv import load_dotenv
import psycopg2
# --------------------

app = FastAPI()

# --- Load environment variables from .env file ---
load_dotenv()
# --------------------------------------------------------

# --- Configuration ---
TILESETS_DIR = "./tiles"

# --- Neon DB Configuration ---
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("⚠️ DATABASE_URL not found in environment variables. The /tile-label endpoint will not work.")
# -----------------------------

# GCS Client Initialization (no changes here)
try:
    from google.cloud import storage
    BUCKET_NAME = 'n-large'
    YOUR_PROJECT_ID = 'gen-lang-client-0849924728'
    storage_client = storage.Client(project=YOUR_PROJECT_ID)
    bucket = storage_client.bucket(BUCKET_NAME)
    list(bucket.list_blobs(max_results=1))
    print(f"✅ Connected to GCS bucket: gs://{bucket.name}")
except Exception as e:
    print(f"⚠️ GCS not available ({str(e)[:100]}...). API might not function correctly.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- No changes to the endpoints below ---
@app.get("/info/{image_set}")
async def get_image_info(image_set: str):
    config_path = f"{image_set}/config.json"
    blob = bucket.blob(config_path)
    if not blob.exists():
        raise HTTPException(status_code=404, detail="Image configuration not found.")
    config_bytes = blob.download_as_bytes()
    config_data = json.loads(config_bytes)
    config_data['tileSourceUrl'] = f"https://storage.googleapis.com/{BUCKET_NAME}/{image_set}"
    return config_data

@app.get("/tiles/{image_set}/{z}/{x}/{y}.png")
async def get_tile(image_set: str, z: int, x: int, y: int):
    blob_path = f"{image_set}/{z}/{x}/{y}.png"
    blob = bucket.blob(blob_path)
    if not blob.exists():
        raise HTTPException(status_code=404, detail="Tile not found in GCS")
    tile_bytes = blob.download_as_bytes()
    return Response(content=tile_bytes, media_type="image/png")

@app.get("/tiles-debug/{image_set}/{z}/{x}/{y}.png")
async def get_tile_debug(image_set: str, z: int, x: int, y: int):
    blob_path = f"{image_set}/{z}/{x}/{y}.png"
    blob = bucket.blob(blob_path)
    if not blob.exists():
        raise HTTPException(status_code=404, detail="Tile not found in GCS")
    tile_bytes = blob.download_as_bytes()
    img = Image.open(io.BytesIO(tile_bytes))
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

@app.get("/")
def read_root():
    return {"message": "NASA Image Tile Server is running"}
# --- End of unchanged endpoints ---


# --- REPLACED endpoint logic for PostgreSQL ---
@app.get("/tile-label")
async def get_tile_label(file_path: str = Query(..., description="Full GCS file path of the tile")):
    """
    Returns the label/value for the given tile file path by querying the Neon PostgreSQL DB.
    """
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database service is not configured.")

    conn = None
    try:
        # 1. Connect to your Neon database using the URL
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # 2. Execute a secure, parameterized query against the 'nlarge' table
        cur.execute("SELECT value FROM nlarge WHERE file_path = %s", (file_path,))
        
        # 3. Fetch the first matching row
        result = cur.fetchone()
        
        cur.close()

        if result:
            # The result is a tuple, e.g., ('nebula',), so we get the first item
            value = result[0]
            return {"file_path": file_path, "value": value}
        else:
            # If no record was found, return a 404 error
            raise HTTPException(status_code=404, detail="No label found for this tile")
            
    except Exception as e:
        print(f"❌ Database query failed: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while querying the database.")
    finally:
        # 4. Important: Always close the connection
        if conn is not None:
            conn.close()
# -------------------------------------------------