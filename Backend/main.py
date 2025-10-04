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

@app.get("/tiles-debug/{image_set}/{z}/{x}/{y}.png")
async def get_tile_with_debug(image_set: str, z: int, x: int, y: int):
    """
    This endpoint returns tiles with debug information overlaid.
    Shows level, column (X), and row (Y) information on each tile.
    """
    from PIL import Image, ImageDraw, ImageFont
    import io
    from fastapi.responses import StreamingResponse
    
    print(f"🔍 Debug tile request: {image_set}/{z}/{x}/{y}.png")
    
    tile_path = os.path.join(TILESETS_DIR, image_set, str(z), str(x), f"{y}.png")
    
    if not os.path.exists(tile_path):
        print(f"❌ Tile not found: {tile_path}")
        raise HTTPException(status_code=404, detail="Tile not found")
    
    # Load the original tile
    img = Image.open(tile_path)
    draw = ImageDraw.Draw(img)
    
    # Try to use a built-in font, fallback to default if not available
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 20)
    except:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        except:
            font = ImageFont.load_default()
    
    # Add debug information
    debug_text = f"Level: {z}\nColumn: {x}\nRow: {y}\nSize: {img.width}x{img.height}"
    
    # Draw semi-transparent background for text
    text_bbox = draw.textbbox((0, 0), debug_text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    
    # Create overlay for text background
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    # Draw background rectangle
    overlay_draw.rectangle([5, 5, text_width + 15, text_height + 15], fill=(0, 0, 0, 128))
    
    # Composite overlay onto image
    img = img.convert('RGBA')
    img = Image.alpha_composite(img, overlay)
    
    # Draw text
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), debug_text, fill=(255, 255, 255, 255), font=font)
    
    # Draw border around tile
    draw.rectangle([0, 0, img.width-1, img.height-1], outline=(0, 255, 0, 255), width=2)
    
    # Convert back to RGB and save to bytes
    img = img.convert('RGB')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    print(f"✅ Serving debug tile: {tile_path}")
    
    return StreamingResponse(io.BytesIO(img_byte_arr.read()), media_type="image/png")

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