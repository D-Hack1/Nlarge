import os
import io
import json
import math # <-- Import the math library
from PIL import Image
from google.cloud import storage

# --- CONFIGURATION ---
SOURCE_IMAGE_PATH = './tiles/sample4.tif'
BUCKET_NAME = 'n-large'
YOUR_PROJECT_ID = 'gen-lang-client-0849924728'
OUTPUT_PREFIX = 'star-birth2'
TILE_SIZE = 512 # <-- Updated tile size
# The desired size of the smallest dimension at the most zoomed-out level.
# This helps determine how many zoom levels are needed.
MIN_LEVEL_SIZE = 512 

# --- SCRIPT ---

def create_and_upload_tiles():
    # Initialize the Google Cloud Storage client
    print("Initializing Google Cloud Storage client...")
    storage_client = storage.Client(project=YOUR_PROJECT_ID)
    bucket = storage_client.bucket(BUCKET_NAME)
    print(f"Uploading to bucket: gs://{bucket.name}")

    print("Opening source image...")
    Image.MAX_IMAGE_PIXELS = None # Allow Pillow to open very large images
    source_image = Image.open(SOURCE_IMAGE_PATH)
    original_width, original_height = source_image.size
    print(f"Source image size: {original_width}x{original_height}")

    # --- DYNAMICALLY CALCULATE MAX_ZOOM ---
    # This logic is now inside the function because it depends on the image dimensions.
    if original_width <= 0:
        raise ValueError("Source image width must be positive.")
    MAX_ZOOM = int(math.ceil(math.log2(original_width / MIN_LEVEL_SIZE)))
    print(f"Dynamically calculated MAX_ZOOM: {MAX_ZOOM}")
    # ------------------------------------

    # Loop through each zoom level to create and upload tiles
    for z in range(MAX_ZOOM + 1):
        print(f"--- Processing zoom level {z} ---")
        scale = 2**(MAX_ZOOM - z)
        scaled_width = original_width // scale
        scaled_height = original_height // scale
        
        if scaled_width == 0 or scaled_height == 0:
            print(f"Skipping zoom level {z} due to zero size.")
            continue

        print(f"Resizing image to {scaled_width}x{scaled_height} for this level...")
        scaled_image = source_image.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
        
        cols = scaled_width // TILE_SIZE
        rows = scaled_height // TILE_SIZE
        
        for y in range(rows + 1):
            for x in range(cols + 1):
                left = x * TILE_SIZE
                upper = y * TILE_SIZE
                right = left + TILE_SIZE
                lower = upper + TILE_SIZE

                tile = scaled_image.crop((left, upper, right, lower))

                blob_path = f"{OUTPUT_PREFIX}/{z}/{x}/{y}.png"
                blob = bucket.blob(blob_path)

                in_mem_file = io.BytesIO()
                tile.save(in_mem_file, format='PNG')
                in_mem_file.seek(0)

                blob.upload_from_file(in_mem_file)

    print("--- Tiling and image upload complete! ---")
    
    # --- CREATE AND UPLOAD CONFIG.JSON ---
    print("--- Creating and uploading config.json ---")
    
    # 1. Create the configuration dictionary
    config_data = {
        "width": original_width,
        "height": original_height,
        "tileSize": TILE_SIZE,
        "maxLevel": MAX_ZOOM
    }

    # 2. Define the path for the config file in the bucket
    config_blob_path = f"{OUTPUT_PREFIX}/config.json"
    config_blob = bucket.blob(config_blob_path)

    # 3. Convert the dictionary to a JSON string and upload it
    # The 'indent=2' makes the file readable
    config_string = json.dumps(config_data, indent=2)
    config_blob.upload_from_string(config_string, content_type='application/json')
    
    print(f"✅ Successfully uploaded config to gs://{bucket.name}/{config_blob_path}")
    # --- END OF NEW SECTION ---


if __name__ == '__main__':
    create_and_upload_tiles()

