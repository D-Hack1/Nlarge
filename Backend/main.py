# main.py
import os
import io
import json
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageDraw, ImageFont

app = FastAPI()

# --- Configuration ---
TILESETS_DIR = "./tiles"
USE_GCS = False
storage_client = None
bucket = None

# Try to initialize GCS, fall back to local files if not available
try:
    from google.cloud import storage
    BUCKET_NAME = 'n-large'
    YOUR_PROJECT_ID = 'gen-lang-client-0849924728'
    
    print("Attempting to initialize Google Cloud Storage client...")
    storage_client = storage.Client(project=YOUR_PROJECT_ID)
    bucket = storage_client.bucket(BUCKET_NAME)
    
    # Test access by trying to list objects (this will fail if no permissions)
    list(bucket.list_blobs(max_results=1))
    
    print(f"✅ Connected to GCS bucket: gs://{bucket.name}")
    USE_GCS = True
except Exception as e:
    print(f"⚠  GCS not available ({str(e)[:100]}...)")
    print(f"📁 Using local files from: {TILESETS_DIR}")
    USE_GCS = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/info/{image_set}")
async def get_image_info(image_set: str):
    """
    Fetches the config.json for an image set AND provides the public base URL
    for fetching tiles directly from Google Cloud Storage.
    """
    config_path = f"{image_set}/config.json"
    blob = bucket.blob(config_path)
    print(f"☁ Looking for config at: gs://{BUCKET_NAME}/{config_path}")

    if not blob.exists():
        print(f"❌ Config not found: {config_path}")
        raise HTTPException(status_code=404, detail="Image configuration not found.")

    try:
        config_bytes = blob.download_as_bytes()
        config_data = json.loads(config_bytes)
        
        # --- KEY ADDITION ---
        # Add the direct GCS URL to the response for the frontend to use.
        config_data['tileSourceUrl'] = f"https://storage.googleapis.com/{BUCKET_NAME}/{image_set}"
        
        print(f"✅ Serving config and tile source URL for: {image_set}")
        return config_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process config file: {e}")


@app.get("/tiles/{image_set}/{z}/{x}/{y}.png")
async def get_tile(image_set: str, z: int, x: int, y: int):
    """
    This endpoint finds and returns a specific tile image FROM GOOGLE CLOUD STORAGE.
    """
    blob_path = f"{image_set}/{z}/{x}/{y}.png"
    blob = bucket.blob(blob_path)

    if not blob.exists():
        raise HTTPException(status_code=404, detail="Tile not found in GCS")

    tile_bytes = blob.download_as_bytes()
    return Response(content=tile_bytes, media_type="image/png")


@app.get("/tiles-debug/{image_set}/{z}/{x}/{y}.png")
async def get_tile_debug(image_set: str, z: int, x: int, y: int):
    """
    Fetches a tile from GCS and draws debug information on it.
    """
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
    return {"message": "NASA Image Tile Server is running (connected to GCS)"}