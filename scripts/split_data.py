import pandas as pd
import os
import json

# 确保输出目录存在
output_dir = 'public/data/split'
os.makedirs(output_dir, exist_ok=True)

# 尝试不同的编码读取CSV文件
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

# 等待用户确认
input("Press Enter to continue with data splitting...")

# SITC类型列表
sitc_types = [
    '0 Food & live animals',
    '1 Beverages & tobacco',
    '2 Crude materials',
    '3 Mineral fuels, lubricants & related materials',
    '4 Animal & vegetable oils, fats & waxes',
    '5 Chemicals & related products',
    '6 Manufactured goods classified chiefly by material',
    '7 Machinery & transport equipment',
    '8 Miscellaneous manufactured articles',
    '9 Commodities/transactions not class\'d elsewhere in SITC'
]

print("Starting to split data by SITC type...")

# 按SITC类型拆分数据
for sitc_type in sitc_types:
    print(f"Processing SITC type: {sitc_type}")
    
    # 过滤特定SITC类型的数据
    sitc_data = df[df['SITC1'] == sitc_type]
    
    # 创建输出文件名 (使用SITC编号作为文件名)
    sitc_num = sitc_type[0]  # 获取SITC类型的数字
    output_file = os.path.join(output_dir, f'sitc_{sitc_num}.json')
    
    # 转换为所需格式并保存
    result = {
        'sitc_type': sitc_type,
        'data': []
    }
    
    # 按年份和流向类型组织数据
    for year in range(2016, 2025):
        year_data = sitc_data[sitc_data['Year'] == year]
        
        for flow_type in ['EU - Exports', 'EU - Imports', 'Non EU - Exports', 'Non EU - Imports']:
            flow_data = year_data[year_data['Flow Type'] == flow_type]
            
            # 按国家聚合数据
            country_data = flow_data.groupby('Country')['Value (￡)'].sum().reset_index()
            
            # 添加到结果中
            result['data'].append({
                'year': year,
                'flow_type': flow_type,
                'countries': country_data.to_dict('records')
            })
    
    # 保存为JSON文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)
    
    print(f"Created file: {output_file}")

print("Data splitting completed!") 