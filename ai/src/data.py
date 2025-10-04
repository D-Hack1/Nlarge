import os
import random
from PIL import Image
import numpy as np

# 1. Load and preprocess a single image
def load_image(path, size=(224,224)):
    img = Image.open(path).convert("RGB")      # ensure 3 channels
    img = img.resize(size)
    img_array = np.array(img) / 255.0          # normalize 0-1
    return img_array

# 2. Get all image paths and labels
def get_image_paths(root_dir):
    classes = os.listdir(root_dir)
    image_paths = []
    for cls in classes:
        cls_path = os.path.join(root_dir, cls)
        for file in os.listdir(cls_path):
            if file.lower().endswith((".jpg",".png", ".bmp", ".tiff", ".jpeg")):
                image_paths.append((os.path.join(cls_path, file), cls))
    return image_paths

# 3. Split into train/val
def split_dataset(image_paths, val_ratio=0.2):
    random.shuffle(image_paths)
    n_val = int(len(image_paths) * val_ratio)
    val = image_paths[:n_val]
    train = image_paths[n_val:]
    return train, val

# 4. Quick test function (optional)
def visualize_sample(image_paths, n=5):
    import matplotlib.pyplot as plt
    samples = random.sample(image_paths, n)
    for path, label in samples:
        img = load_image(path)
        plt.imshow(img)
        plt.title(label)
        plt.show()
