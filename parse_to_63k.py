import urllib.request
import re

url = "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/extras/cross_references.txt"
req = urllib.request.urlopen(url)
lines = req.read().decode('utf-8').splitlines()

# The original has 63779. Maybe the top voted 63779?
# Or maybe just deduplicated by chapter? The prompt asks for Gen.1.1 Rev.22.21 format.
print(len(lines))
