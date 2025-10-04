# main.py
import os
import io
import json # <-- Import the json library
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
from PIL import Image, ImageDraw, ImageFont

app = FastAPI()

# --- GCS Configuration ---
BUCKET_NAME = 'n-large'
YOUR_PROJECT_ID = 'gen-lang-client-0849924728'

# --- Initialize GCS Client ---
print("Initializing Google Cloud Storage client...")
storage_client = storage.Client(project=YOUR_PROJECT_ID)
bucket = storage_client.bucket(BUCKET_NAME)
print(f"Connected to bucket: gs://{bucket.name}")
# -------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW ENDPOINT TO SERVE IMAGE METADATA ---
@app.get("/info/{image_set}")
async def get_image_info(image_set: str):
    """
    Fetches the config.json file for a given image set from GCS.
    """
    config_path = f"{image_set}/config.json"
    blob = bucket.blob(config_path)
    print(f"☁️ Looking for config at: gs://{BUCKET_NAME}/{config_path}")

    if not blob.exists():
        print(f"❌ Config not found: {config_path}")
        raise HTTPException(status_code=404, detail="Image configuration not found.")

    try:
        config_bytes = blob.download_as_bytes()
        config_data = json.loads(config_bytes)
        print(f"✅ Serving config for: {image_set}")
        return config_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse config file: {e}")
# --- END OF NEW ENDPOINT ---


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
    return {"message": "NASA Image Tile Server is running (connected to GCS)"}
