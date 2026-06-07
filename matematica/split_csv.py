import csv
import math
import os

csv_path = os.path.join(os.path.dirname(__file__), 'matematica_completo.csv')
out_path = os.path.join(os.path.dirname(__file__), 'matematica_series.csv')

grades = ["6-ano", "7-ano", "8-ano", "9-ano", "1-em", "2-em", "3-em"]

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f, delimiter=';')
    header = next(reader)
    rows = list(reader)

num_grades = len(grades)
total_rows = len(rows)
chunk_size = math.ceil(total_rows / num_grades)

header[0] = 'grade'

with open(out_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f, delimiter=';')
    writer.writerow(header)
    
    for i, row in enumerate(rows):
        grade_index = min(i // chunk_size, num_grades - 1)
        row[0] = grades[grade_index]
        writer.writerow(row)

print(f"Processed {total_rows} rows into {num_grades} grades.")
