path = 'C:/code/ittutor/js/checker.js'
lines = open(path, encoding='utf-8').readlines()

fixed = []
for line in lines:
    if "normalize('NFD')" in line and 'replace' in line:
        indent = len(line) - len(line.lstrip())
        line = ' ' * indent + "return str.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n"
    fixed.append(line)

open(path, 'w', encoding='utf-8').writelines(fixed)
print("Fixed. Relevant line:")
for i, line in enumerate(fixed):
    if "normalize('NFD')" in line:
        print(f"  {i+1}: {line.rstrip()}")
