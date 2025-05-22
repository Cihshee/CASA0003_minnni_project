import pandas as pd
import os
import json

# Ensure the output directory exists
output_dir = 'public/data/split'
os.makedirs(output_dir, exist_ok=True)

# Try different encodings to read the CSV file
encodings = ['utf-8', 'gbk', 'gb2312', 'cp1252', 'latin1']
for encoding in encodings:
    try:
        print(f"Trying encoding: {encoding}")
        df = pd.read_csv('public/data/Goodstype_all_years_by_country_merged.csv', encoding=encoding)
        print(f"Successfully read file with encoding: {encoding}")
        break
    except Exception as e:
        print(f"Failed with encoding {encoding}: {str(e)}")
else:
    raise Exception("Failed to read CSV file with any encoding")

print("Continuing with data splitting...")

# List of SITC types (Standard International Trade Classification)
sitc_types = [
    '0 Food & live animals',
    '1 Beverages & tobacco',
    '2 Crude materials, inedible, except fuels',
    '3 Mineral fuels, lubricants & related materials',
    '4 Animal & vegetable oils, fats & waxes',
    '5 Chemicals & related products, nes',  # Correct full name with ", nes"
    '6 Manufactured goods classified chiefly by material',
    '7 Machinery & transport equipment',
    '8 Miscellaneous manufactured articles',
    "9 Commodities/transactions not class'd elsewhere in SITC"
]

print("Starting to split data by SITC type...")

# Split the data by SITC type
for sitc_type in sitc_types:
    print(f"Processing SITC type: {sitc_type}")

    # Filter data for the specific SITC type
    sitc_data = df[df['SITC1'] == sitc_type]

    # Create output filename using the SITC number
    sitc_num = sitc_type[0]  # Get the SITC type number (first character)
    output_file = os.path.join(output_dir, f'sitc_{sitc_num}.json')

    # Prepare the result structure
    result = {
        'sitc_type': sitc_type,
        'data': []
    }

    # Organize data by year and flow type
    for year in range(2016, 2025):
        year_data = sitc_data[sitc_data['Year'] == year]

        for flow_type in ['EU - Exports', 'EU - Imports', 'Non EU - Exports', 'Non EU - Imports']:
            flow_data = year_data[year_data['Flow Type'] == flow_type]

            # Aggregate data by country
            country_data = flow_data.groupby('Country')['Value (￡)'].sum().reset_index()

            # Add to the result list
            result['data'].append({
                'year': year,
                'flow_type': flow_type,
                'countries': country_data.to_dict('records')
            })

    # Save the result as a JSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)

    print(f"Created file: {output_file}")

print("Data splitting completed!") 