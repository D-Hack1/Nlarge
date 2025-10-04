# main.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# --- IMPORTANT: CORS Middleware ---
# This allows your React frontend (running on a different port)
# to make requests to this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# The base directory where all your tile sets are stored
TILESETS_DIR = "./tiles"

@app.get("/tiles/{image_set}/{z}/{x}/{y}.png")
async def get_tile(image_set: str, z: int, x: int, y: int):
    """
    This endpoint finds and returns a specific tile image.
    The path is constructed from the URL parameters.
    Example: /tiles/blue_fits/3/4/5.png
    """
    print(f"🔍 Tile request: {image_set}/{z}/{x}/{y}.png")  # Debug logging
    
    tile_path = os.path.join(TILESETS_DIR, image_set, str(z), str(x), f"{y}.png")
    print(f"📁 Looking for tile at: {tile_path}")  # Debug logging
    
    if not os.path.exists(tile_path):
        print(f"❌ Tile not found: {tile_path}")  # Debug logging
        # If a tile doesn't exist, raise a 404 error
        raise HTTPException(status_code=404, detail="Tile not found")
    
    print(f"✅ Serving tile: {tile_path}")  # Debug logging    
    # Return the image file
    return FileResponse(tile_path)

@app.get("/")
def read_root():
    return {"message": "NASA Image Tile Server is running"}

@app.get("/debug/tiles/{image_set}")
async def debug_tiles(image_set: str):
    """Debug endpoint to check if tiles exist for an image set"""
    tiles_path = os.path.join(TILESETS_DIR, image_set)
    if not os.path.exists(tiles_path):
        return {"error": f"Image set '{image_set}' not found", "available_sets": os.listdir(TILESETS_DIR)}
    
    # List available zoom levels
    zoom_levels = []
    for item in os.listdir(tiles_path):
        if os.path.isdir(os.path.join(tiles_path, item)) and item.isdigit():
            zoom_levels.append(int(item))
    
    return {
        "image_set": image_set,
        "tiles_path": tiles_path,
        "zoom_levels": sorted(zoom_levels),
        "sample_tile": f"/tiles/{image_set}/0/0/0.png"
    }