from pdf2image import convert_from_path
import sys
import os

input_file = sys.argv[1]
output_dir = sys.argv[2]

images = convert_from_path(input_file, 150)
for i, image in enumerate(images):
    image.save(os.path.join(output_dir, f'output_{i}.jpg'), 'JPEG')
