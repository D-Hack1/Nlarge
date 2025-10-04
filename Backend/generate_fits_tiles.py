import os
from PIL import Image
import math

# --- CONFIGURATION ---
SOURCE_IMAGE_PATH = './tiles/starbirth.tif'  # The giant image you downloaded
OUTPUT_DIR = './tiles/starbirth_fits'            # Where the tile folders will be created
TILE_SIZE = 512  # The width and height of each tile in pixels
Image.MAX_IMAGE_PIXELS = None
source_image = Image.open(SOURCE_IMAGE_PATH)
original_width, original_height = source_image.size
min_level_size = 512  # or your preferred minimum
MAX_ZOOM = int(math.ceil(math.log2(original_width / min_level_size)))                     # The maximum zoom level you want to generate

# --- SCRIPT ---

def create_tiles():
    print("Opening source image...")
    # Pillow can have issues with very large images, so this line helps
    Image.MAX_IMAGE_PIXELS = None 
    
    

    print(f"Source image size: {original_width}x{original_height}")

    # Loop through each zoom level
    for z in range(MAX_ZOOM + 1):
        print(f"--- Processing zoom level {z} ---")
        
        # Calculate the dimensions of the image at this zoom level
        scale = 2**(MAX_ZOOM - z)
        scaled_width = original_width // scale
        scaled_height = original_height // scale
        
        if scaled_width == 0 or scaled_height == 0:
            print(f"Skipping zoom level {z} (scaled size is 0x0)")
            continue

        print(f"Resizing image to {scaled_width}x{scaled_height} for this level...")
        scaled_image = source_image.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
        
        # Calculate the number of tiles needed in each direction
        cols = scaled_width // TILE_SIZE
        rows = scaled_height // TILE_SIZE

        # Create the directory for the current zoom level
        zoom_dir = os.path.join(OUTPUT_DIR, str(z))
        
        # Loop through the rows and columns to create each tile
        for y in range(rows + 1):
            for x in range(cols + 1):
                # Define the bounding box for the tile
                left = x * TILE_SIZE
                upper = y * TILE_SIZE
                right = left + TILE_SIZE
                lower = upper + TILE_SIZE

                # Crop the tile from the scaled image
                tile = scaled_image.crop((left, upper, right, lower))

                # Create the tile's directory path
                tile_dir = os.path.join(zoom_dir, str(x))
                if not os.path.exists(tile_dir):
                    os.makedirs(tile_dir)
                
                # Save the tile
                tile_path = os.path.join(tile_dir, f"{y}.png")
                tile.save(tile_path)

    print("--- Tiling complete! ---")
    print(f"IMPORTANT: Image dimensions are Width={original_width}, Height={original_height}") 


if __name__ == '__main__':
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    create_tiles()