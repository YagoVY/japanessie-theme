#!/bin/bash

# Japanessie Theme Deployment Script
echo "🎌 Starting Japanessie Theme Deployment..."

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed or not in PATH"
    exit 1
fi

# Check git status
echo "📋 Checking git status..."
git status

# Add all files
echo "📁 Adding all files to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Complete Japanessie theme deployment with error detection and auto-configuration"

# Push to remote
echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Japanessie Theme Deployment Complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. Go to your Shopify Admin → Online Store → Themes"
echo "2. Click 'Customize' on your Japanessie theme"
echo "3. Check the homepage for the deployment status section"
echo "4. Verify all sections are working correctly"
echo "5. Create the required collections:"
echo "   - /collections/custom"
echo "   - /collections/artistic" 
echo "   - /collections/quick"
echo "   - /collections/mugs"
echo "   - /collections/designs"
echo ""
echo "🎉 Your Japanessie theme is now ready!"
