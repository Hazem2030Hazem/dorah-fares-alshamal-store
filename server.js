
# Read the server.js file and prepare it for display
with open('/mnt/agents/output/server.js', 'r', encoding='utf-8') as f:
    server_content = f.read()

# Save it as a text file for easy copying
with open('/mnt/agents/output/server_js_content.txt', 'w', encoding='utf-8') as f:
    f.write(server_content)

print(f"✅ server.js content saved to file")
print(f"Size: {len(server_content):,} characters")
print(f"\n📄 First 500 characters:")
print(server_content[:500])
