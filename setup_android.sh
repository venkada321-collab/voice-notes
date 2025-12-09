#!/bin/bash
set -e

# 1. Install Java 17
echo "Installing OpenJDK 17..."
sudo apt-get update
sudo apt-get install -y openjdk-17-jdk unzip

# 2. Setup Variables
export ANDROID_HOME=$HOME/android-sdk
export CMDLINE_TOOLS_ROOT=$ANDROID_HOME/cmdline-tools
mkdir -p $CMDLINE_TOOLS_ROOT

# 3. Download Command Line Tools
echo "Downloading Android Command Line Tools..."
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
unzip -q cmdline-tools.zip
rm cmdline-tools.zip

# 4. Move to correct structure (latest/bin)
# The zip works out to cmdline-tools/bin, but sdkmanager needs cmdline-tools/latest/bin
mkdir -p $CMDLINE_TOOLS_ROOT/latest
mv cmdline-tools/* $CMDLINE_TOOLS_ROOT/latest/ 2>/dev/null || true
rmdir cmdline-tools

# 5. Accept Licenses and Install Packages
echo "Installing Android Platforms and Build Tools..."
export PATH=$PATH:$CMDLINE_TOOLS_ROOT/latest/bin:$ANDROID_HOME/platform-tools

yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo "Android SDK Setup Complete!"
echo "Please add these lines to your ~/.bashrc:"
echo "export ANDROID_HOME=\$HOME/android-sdk"
echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools"
