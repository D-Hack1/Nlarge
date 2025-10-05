import os
import warnings
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.models import resnet18, ResNet18_Weights
from data import get_image_paths, split_dataset, load_image
from tqdm import tqdm
from PIL import Image
import numpy as np

# Ignore PIL warnings
warnings.filterwarnings("ignore", category=UserWarning, module="PIL")


# ---- Custom Dataset ----
class SpaceDataset(Dataset):
    def __init__(self, image_label_list, transform=None):
        self.data = image_label_list
        self.transform = transform
        self.classes = sorted(list(set([label for _, label in image_label_list])))

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        path, label = self.data[idx]
        img = load_image(path)  # returns NumPy array 0-1

        # Convert NumPy array to PIL Image
        if isinstance(img, np.ndarray):
            img = Image.fromarray((img * 255).astype(np.uint8))

        if self.transform:
            img = self.transform(img)

        label_idx = self.classes.index(label)
        return img, label_idx


# ---- Main training code ----
if __name__ == "__main__":
    # ---- Transforms ----
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1)
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
    ])

    # ---- Load Dataset ----
    root = "dataset/train"
    paths = get_image_paths(root)
    train_list, val_list = split_dataset(paths, val_ratio=0.2)

    train_ds = SpaceDataset(train_list, transform=train_transform)
    val_ds = SpaceDataset(val_list, transform=val_transform)

    # ---- DataLoader ----
    batch_size = 8
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0, pin_memory=False)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0, pin_memory=False)

    # ---- Model Setup ----
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = resnet18(weights=ResNet18_Weights.DEFAULT)

    # Freeze all layers except last fc
    for param in model.parameters():
        param.requires_grad = False

    num_features = model.fc.in_features
    num_classes = len(train_ds.classes)
    model.fc = nn.Linear(num_features, num_classes)  # last layer is trainable
    model = model.to(device)

    # ---- Loss + Optimizer ----
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.fc.parameters(), lr=1e-3)  # only last layer

    # ---- Training Loop with Validation ----
    epochs = 20
    for epoch in range(epochs):
        model.train()
        running_loss = 0
        for imgs, labels in tqdm(train_loader, desc=f"Epoch {epoch + 1}/{epochs}"):
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        # ---- Validation ----
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()

        val_acc = correct / total * 100
        print(f"Epoch {epoch + 1}, Loss: {running_loss / len(train_loader):.4f}, Val Accuracy: {val_acc:.2f}%")

    # ---- Save Model ----
    os.makedirs("models", exist_ok=True)
    torch.save(model.state_dict(), "ai/models/space_model.pt")
    print("Model saved to ai/models/space_model.pt")
