import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))
from data import get_image_paths, split_dataset, visualize_sample

root = "dataset/train"
paths = get_image_paths(root)
train, val = split_dataset(paths, val_ratio=0.2)

print(f"Train samples: {len(train)}")
print(f"Val samples: {len(val)}")

visualize_sample(train, n=3)
