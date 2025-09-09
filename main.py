import json

# Define the input and output file names
input_file_path = 'fb.json'
output_file_path = 'quizzes.json'

try:
    # Open the original JSON file and load its content
    with open(input_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Extract the 'Sets' object which contains all the quiz data
    quiz_data = data.get('Sets')

    if quiz_data:
        # Open the output file in write mode
        with open(output_file_path, 'w', encoding='utf-8') as f:
            # Write the extracted quiz_data to the new JSON file
            # 'indent=4' makes the JSON file readable
            json.dump(quiz_data, f, indent=4)
        
        print(f"✅ Successfully extracted all quizzes and saved them to '{output_file_path}'")

    else:
        print("❌ Error: The 'Sets' key was not found in the JSON file.")

except FileNotFoundError:
    print(f"❌ Error: The file '{input_file_path}' was not found.")
except json.JSONDecodeError:
    print(f"❌ Error: Could not decode the JSON from the file '{input_file_path}'.")