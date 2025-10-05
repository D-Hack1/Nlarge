import torch
from torchvision import transforms, models
from torchvision.models import resnet18, ResNet18_Weights
from PIL import Image
import os
from data import get_image_paths, split_dataset
import psycopg2
from dotenv import load_dotenv
import requests
from io import BytesIO
from data import get_image_paths, split_dataset
import math

load_dotenv()
db_url = os.getenv("DATABASE_URL")
gcs_base_url = "https://storage.googleapis.com/"
bucket_name = "n-large"

conn = psycopg2.connect(db_url)
cursor = conn.cursor()

# Device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load model structure
model = resnet18(weights=ResNet18_Weights.DEFAULT)
num_features = model.fc.in_features

# Get classes automatically from training dataset
train_root = "dataset/train"
paths = get_image_paths(train_root)
_, _ = split_dataset(paths, val_ratio=0.2)
classes = sorted(list(set([label for _, label in paths])))
num_classes = len(classes)

# Replace fc layer to match number of classes
model.fc = torch.nn.Linear(num_features, num_classes)
model.load_state_dict(torch.load("ai/models/space_model.pt", map_location=device))
model = model.to(device)
model.eval()

# Define transforms
transform = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.ToTensor(),
])

def load_image_from_url(url):
    response = requests.get(url)
    response.raise_for_status()
    img = Image.open(BytesIO(response.content)).convert("RGB")
    return img

# Predict from PIL image and store in DB
def predict_image_from_url(url, model, transform, classes):
    img = load_image_from_url(url)
    img = transform(img).unsqueeze(0)  # add batch dimension
    img = img.to(device)
    
    with torch.no_grad():
        outputs = model(img)
        _, predicted = torch.max(outputs, 1)
    prediction = classes[predicted.item()]

    # Insert prediction into existing DB table
    try:
        cursor.execute("""
            INSERT INTO nlarge(file_path, value)
            VALUES (%s, %s)
        """, (url, prediction))
        conn.commit()
        print(f"Stored in DB: {url} -> {prediction}")
    except Exception as e:
        print("DB Error:", e)

    return prediction

# Calculate MAX_ZOOM automatically from image dimensions
def calculate_max_zoom(original_width, original_height, TILE_SIZE=512):
    zoom_w = math.ceil(math.log2(original_width / TILE_SIZE))
    zoom_h = math.ceil(math.log2(original_height / TILE_SIZE))
    return max(zoom_w, zoom_h)

# === Function to compute tiles dynamically using backend formula ===
def get_tiles_for_image(original_width, original_height, TILE_SIZE=512):
    MAX_ZOOM = calculate_max_zoom(original_width, original_height, TILE_SIZE)
    tiles_info = []
    for z in range(MAX_ZOOM + 1):
        scale = 2**(MAX_ZOOM - z)
        scaled_width = original_width // scale
        scaled_height = original_height // scale

        if scaled_width == 0 or scaled_height == 0:
            continue

        cols = scaled_width // TILE_SIZE
        rows = scaled_height // TILE_SIZE

        for y in range(rows + 1):
            for x in range(cols + 1):
                tiles_info.append((z, x, y))
    return tiles_info

# === Main process_image function called by backend ===
def process_image(image_name, original_width, original_height, TILE_SIZE=512):
    tiles = get_tiles_for_image(original_width, original_height, TILE_SIZE)
    for z, x, y in tiles:
        url = f"{gcs_base_url}{bucket_name}/{image_name}/{z}/{x}/{y}.png"
        predict_image_from_url(url, model, transform, classes)

process_image("bubble-nebula", 7857, 7462)

# Close DB connection
cursor.close()
conn.close()
