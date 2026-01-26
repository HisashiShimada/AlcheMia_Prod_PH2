-- file_metadata テーブルのテストデータ
-- Swiftストレージに作成したテストファイルのメタデータを登録

-- 【前提条件】
-- - create-test-files-in-swift.sh でSwiftにファイルが作成済みであること
-- - organization_id: a0718dc5-21f3-44e6-87e9-cc2ae83f3385 (org_maiml_lab_001)
-- - uploaded_by: 0c5d7815-5bc1-477f-9749-230b8156901e (worker_user_001)

-- ===================================
-- 1. HighTempSuperconductor
-- ===================================

-- 現在のMAIMLファイル
INSERT INTO file_metadata (
    file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path
) VALUES (
    'org_maiml_lab_001/projects/HighTempSuperconductor/HighTempSuperconductor.maiml',
    'mmdpf-files',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    'HighTempSuperconductor.maiml',
    2500,
    'application/xml',
    '0c5d7815-5bc1-477f-9749-230b8156901e',
    'org_maiml_lab_001/projects/HighTempSuperconductor'
);

-- アーカイブファイル v1
INSERT INTO file_metadata (
    file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path
) VALUES (
    'org_maiml_lab_001/projects/HighTempSuperconductor/archive/HighTempSuperconductor_v1.maiml',
    'mmdpf-files',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    'HighTempSuperconductor_v1.maiml',
    2450,
    'application/xml',
    '0c5d7815-5bc1-477f-9749-230b8156901e',
    'org_maiml_lab_001/projects/HighTempSuperconductor/archive'
);

-- アーカイブファイル v2
INSERT INTO file_metadata (
    file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path
) VALUES (
    'org_maiml_lab_001/projects/HighTempSuperconductor/archive/HighTempSuperconductor_v2.maiml',
    'mmdpf-files',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    'HighTempSuperconductor_v2.maiml',
    2480,
    'application/xml',
    '0c5d7815-5bc1-477f-9749-230b8156901e',
    'org_maiml_lab_001/projects/HighTempSuperconductor/archive'
);

-- README.txt
INSERT INTO file_metadata (
    file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path
) VALUES (
    'org_maiml_lab_001/projects/HighTempSuperconductor/README.txt',
    'mmdpf-files',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    'README.txt',
    150,
    'text/plain',
    '0c5d7815-5bc1-477f-9749-230b8156901e',
    'org_maiml_lab_001/projects/HighTempSuperconductor'
);

-- data.csv
INSERT INTO file_metadata (
    file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path
) VALUES (
    'org_maiml_lab_001/projects/HighTempSuperconductor/data.csv',
    'mmdpf-files',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    'data.csv',
    180,
    'text/csv',
    '0c5d7815-5bc1-477f-9749-230b8156901e',
    'org_maiml_lab_001/projects/HighTempSuperconductor'
);

-- results.csv
INSERT INTO file_metadata (
    file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path
) VALUES (
    'org_maiml_lab_001/projects/HighTempSuperconductor/results.csv',
    'mmdpf-files',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385',
    'results.csv',
    140,
    'text/csv',
    '0c5d7815-5bc1-477f-9749-230b8156901e',
    'org_maiml_lab_001/projects/HighTempSuperconductor'
);

-- ===================================
-- 2. LithiumBatteryCathode
-- ===================================

INSERT INTO file_metadata (file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path) VALUES
('org_maiml_lab_001/projects/LithiumBatteryCathode/LithiumBatteryCathode.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'LithiumBatteryCathode.maiml', 2400, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/LithiumBatteryCathode'),
('org_maiml_lab_001/projects/LithiumBatteryCathode/archive/LithiumBatteryCathode_v1.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'LithiumBatteryCathode_v1.maiml', 2350, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/LithiumBatteryCathode/archive'),
('org_maiml_lab_001/projects/LithiumBatteryCathode/archive/LithiumBatteryCathode_v2.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'LithiumBatteryCathode_v2.maiml', 2380, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/LithiumBatteryCathode/archive'),
('org_maiml_lab_001/projects/LithiumBatteryCathode/README.txt', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'README.txt', 145, 'text/plain', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/LithiumBatteryCathode'),
('org_maiml_lab_001/projects/LithiumBatteryCathode/data.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'data.csv', 180, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/LithiumBatteryCathode'),
('org_maiml_lab_001/projects/LithiumBatteryCathode/results.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'results.csv', 140, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/LithiumBatteryCathode');

-- ===================================
-- 3. PerovskiteSolarCell
-- ===================================

INSERT INTO file_metadata (file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path) VALUES
('org_maiml_lab_001/projects/PerovskiteSolarCell/PerovskiteSolarCell.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'PerovskiteSolarCell.maiml', 2300, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/PerovskiteSolarCell'),
('org_maiml_lab_001/projects/PerovskiteSolarCell/archive/PerovskiteSolarCell_v1.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'PerovskiteSolarCell_v1.maiml', 2250, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/PerovskiteSolarCell/archive'),
('org_maiml_lab_001/projects/PerovskiteSolarCell/archive/PerovskiteSolarCell_v2.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'PerovskiteSolarCell_v2.maiml', 2280, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/PerovskiteSolarCell/archive'),
('org_maiml_lab_001/projects/PerovskiteSolarCell/README.txt', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'README.txt', 142, 'text/plain', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/PerovskiteSolarCell'),
('org_maiml_lab_001/projects/PerovskiteSolarCell/data.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'data.csv', 180, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/PerovskiteSolarCell'),
('org_maiml_lab_001/projects/PerovskiteSolarCell/results.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'results.csv', 140, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/PerovskiteSolarCell');

-- ===================================
-- 4. NanoparticleCatalyst
-- ===================================

INSERT INTO file_metadata (file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path) VALUES
('org_maiml_lab_001/projects/NanoparticleCatalyst/NanoparticleCatalyst.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'NanoparticleCatalyst.maiml', 2350, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/NanoparticleCatalyst'),
('org_maiml_lab_001/projects/NanoparticleCatalyst/archive/NanoparticleCatalyst_v1.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'NanoparticleCatalyst_v1.maiml', 2300, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/NanoparticleCatalyst/archive'),
('org_maiml_lab_001/projects/NanoparticleCatalyst/archive/NanoparticleCatalyst_v2.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'NanoparticleCatalyst_v2.maiml', 2330, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/NanoparticleCatalyst/archive'),
('org_maiml_lab_001/projects/NanoparticleCatalyst/README.txt', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'README.txt', 143, 'text/plain', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/NanoparticleCatalyst'),
('org_maiml_lab_001/projects/NanoparticleCatalyst/data.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'data.csv', 180, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/NanoparticleCatalyst'),
('org_maiml_lab_001/projects/NanoparticleCatalyst/results.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'results.csv', 140, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/NanoparticleCatalyst');

-- ===================================
-- 5. GrapheneComposite
-- ===================================

INSERT INTO file_metadata (file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path) VALUES
('org_maiml_lab_001/projects/GrapheneComposite/GrapheneComposite.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'GrapheneComposite.maiml', 2200, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/GrapheneComposite'),
('org_maiml_lab_001/projects/GrapheneComposite/archive/GrapheneComposite_v1.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'GrapheneComposite_v1.maiml', 2150, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/GrapheneComposite/archive'),
('org_maiml_lab_001/projects/GrapheneComposite/archive/GrapheneComposite_v2.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'GrapheneComposite_v2.maiml', 2180, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/GrapheneComposite/archive'),
('org_maiml_lab_001/projects/GrapheneComposite/README.txt', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'README.txt', 138, 'text/plain', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/GrapheneComposite'),
('org_maiml_lab_001/projects/GrapheneComposite/data.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'data.csv', 180, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/GrapheneComposite'),
('org_maiml_lab_001/projects/GrapheneComposite/results.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'results.csv', 140, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/GrapheneComposite');

-- ===================================
-- 6. RareEarthMagnet
-- ===================================

INSERT INTO file_metadata (file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path) VALUES
('org_maiml_lab_001/projects/RareEarthMagnet/RareEarthMagnet.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'RareEarthMagnet.maiml', 2250, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/RareEarthMagnet'),
('org_maiml_lab_001/projects/RareEarthMagnet/archive/RareEarthMagnet_v1.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'RareEarthMagnet_v1.maiml', 2200, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/RareEarthMagnet/archive'),
('org_maiml_lab_001/projects/RareEarthMagnet/archive/RareEarthMagnet_v2.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'RareEarthMagnet_v2.maiml', 2230, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/RareEarthMagnet/archive'),
('org_maiml_lab_001/projects/RareEarthMagnet/README.txt', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'README.txt', 136, 'text/plain', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/RareEarthMagnet'),
('org_maiml_lab_001/projects/RareEarthMagnet/data.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'data.csv', 180, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/RareEarthMagnet'),
('org_maiml_lab_001/projects/RareEarthMagnet/results.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'results.csv', 140, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/RareEarthMagnet');

-- ===================================
-- 7. OrganicSolarCell
-- ===================================

INSERT INTO file_metadata (file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path) VALUES
('org_maiml_lab_001/projects/OrganicSolarCell/OrganicSolarCell.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'OrganicSolarCell.maiml', 2180, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/OrganicSolarCell'),
('org_maiml_lab_001/projects/OrganicSolarCell/archive/OrganicSolarCell_v1.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'OrganicSolarCell_v1.maiml', 2130, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/OrganicSolarCell/archive'),
('org_maiml_lab_001/projects/OrganicSolarCell/archive/OrganicSolarCell_v2.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'OrganicSolarCell_v2.maiml', 2160, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/OrganicSolarCell/archive'),
('org_maiml_lab_001/projects/OrganicSolarCell/README.txt', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'README.txt', 137, 'text/plain', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/OrganicSolarCell'),
('org_maiml_lab_001/projects/OrganicSolarCell/data.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'data.csv', 180, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/OrganicSolarCell'),
('org_maiml_lab_001/projects/OrganicSolarCell/results.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'results.csv', 140, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/OrganicSolarCell');

-- ===================================
-- 8. FuelCellElectrolyte
-- ===================================

INSERT INTO file_metadata (file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path) VALUES
('org_maiml_lab_001/projects/FuelCellElectrolyte/FuelCellElectrolyte.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'FuelCellElectrolyte.maiml', 2280, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/FuelCellElectrolyte'),
('org_maiml_lab_001/projects/FuelCellElectrolyte/archive/FuelCellElectrolyte_v1.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'FuelCellElectrolyte_v1.maiml', 2230, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/FuelCellElectrolyte/archive'),
('org_maiml_lab_001/projects/FuelCellElectrolyte/archive/FuelCellElectrolyte_v2.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'FuelCellElectrolyte_v2.maiml', 2260, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/FuelCellElectrolyte/archive'),
('org_maiml_lab_001/projects/FuelCellElectrolyte/README.txt', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'README.txt', 141, 'text/plain', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/FuelCellElectrolyte'),
('org_maiml_lab_001/projects/FuelCellElectrolyte/data.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'data.csv', 180, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/FuelCellElectrolyte'),
('org_maiml_lab_001/projects/FuelCellElectrolyte/results.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'results.csv', 140, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/FuelCellElectrolyte');

-- ===================================
-- 9. QuantumDotLED
-- ===================================

INSERT INTO file_metadata (file_key, s3_bucket, organization_id, original_filename, file_size, file_type, uploaded_by, parent_folder_path) VALUES
('org_maiml_lab_001/projects/QuantumDotLED/QuantumDotLED.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'QuantumDotLED.maiml', 2150, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/QuantumDotLED'),
('org_maiml_lab_001/projects/QuantumDotLED/archive/QuantumDotLED_v1.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'QuantumDotLED_v1.maiml', 2100, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/QuantumDotLED/archive'),
('org_maiml_lab_001/projects/QuantumDotLED/archive/QuantumDotLED_v2.maiml', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'QuantumDotLED_v2.maiml', 2130, 'application/xml', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/QuantumDotLED/archive'),
('org_maiml_lab_001/projects/QuantumDotLED/README.txt', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'README.txt', 133, 'text/plain', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/QuantumDotLED'),
('org_maiml_lab_001/projects/QuantumDotLED/data.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'data.csv', 180, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/QuantumDotLED'),
('org_maiml_lab_001/projects/QuantumDotLED/results.csv', 'mmdpf-files', 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385', 'results.csv', 140, 'text/csv', '0c5d7815-5bc1-477f-9749-230b8156901e', 'org_maiml_lab_001/projects/QuantumDotLED');

-- ===================================
-- テストデータ投入完了
-- ===================================
-- 合計: 9プロジェクト × 6ファイル = 54レコード
