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
    tile_path = os.path.join(TILESETS_DIR, image_set, str(z), str(x), f"{y}.png")
    
    if not os.path.exists(tile_path):
        # If a tile doesn't exist, raise a 404 error
        raise HTTPException(status_code=404, detail="Tile not found")
        
    # Return the image file
    return FileResponse(tile_path)

@app.get("/")
def read_root():
    return {"message": "NASA Image Tile Server is running"}