import torch
from torchvision import transforms, models
from torchvision.models import resnet18, ResNet18_Weights
from PIL import Image
import os
from data import get_image_paths, split_dataset

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

# Load image and predict
def predict_image(image_path, model, transform, classes):
    img = Image.open(image_path).convert("RGB")
    img = transform(img).unsqueeze(0)  # add batch dimension
    img = img.to(device)
    
    with torch.no_grad():
        outputs = model(img)
        _, predicted = torch.max(outputs, 1)
    return classes[predicted.item()]

# Example usage
image_path = "ai/src/galactic-spiral-art-stockcake.jpg"
prediction = predict_image(image_path, model, transform, classes)
print(f"Predicted class: {prediction}")
