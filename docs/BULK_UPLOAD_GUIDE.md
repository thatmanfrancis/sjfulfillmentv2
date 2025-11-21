# Product Bulk Upload Template Guide

## CSV Template Format

The CSV template for bulk product upload should contain the following columns:

### Required Columns
- **name**: Product name (string, required)
- **weightKg**: Product weight in kilograms (number, required, must be > 0)

### Optional Columns
- **sku**: Stock Keeping Unit - unique identifier (string, optional - auto-generated if not provided)
- **length**: Length in centimeters (number, optional)
- **width**: Width in centimeters (number, optional)  
- **height**: Height in centimeters (number, optional)
- **description**: Product description (string, optional)

## Auto-Generated SKU Format

If you don't provide a SKU, the system will automatically generate one using this format:
- **Pattern**: `SKU-{FirstLetter}{LastLetter}_{Number}`
- **Example**: For "Nike Shoes" → `SKU-NS_01`
- **Uniqueness**: The number increments to ensure uniqueness across all products

## Example CSV Content

```csv
name,sku,weightKg,length,width,height,description
"Wireless Bluetooth Headphones",WBH001,0.25,20,18,8,"Premium wireless headphones with noise cancellation"
"Organic Coffee Beans 1kg",,1.0,25,15,8,"Single-origin organic coffee beans (SKU auto-generated)"
"Smart Fitness Tracker",SFT100,0.05,4,2,1,"Waterproof fitness tracker with heart rate monitor"
```

## Important Notes

1. **Header Row**: The first row must contain column headers exactly as specified above
2. **SKU Format**: 
   - If provided, SKUs will be automatically converted to uppercase
   - If empty, SKU will be auto-generated as `SKU-{FirstLetter}{LastLetter}_{Number}`
   - All SKUs must be unique across the entire system
3. **Numeric Values**: Weight and dimensions must be valid positive numbers
4. **Quotes**: Use quotes around text values that contain commas or special characters
5. **File Format**: Save your file as CSV (.csv) format
6. **Validation**: The system will validate each row and show errors for invalid data

## Download Template

You can download a ready-to-use template with sample data from the bulk upload modal in the admin panel.

## Bulk Upload Process

1. Download the CSV template
2. Fill in your product data following the format
3. Select a merchant in the product creation modal
4. Switch to the "Bulk Upload" tab
5. Upload your CSV file
6. Review the preview of parsed products
7. Click "Upload Products" to create all products

The system will process each product individually and provide feedback on successful and failed uploads.