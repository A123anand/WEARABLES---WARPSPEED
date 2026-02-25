from flask import Flask

# Import Flask 
from flask import Flask  

# Create Flask app instance
app = Flask(__name__)

# Route for root URL '/'
@app.route('/')
def index():
    return 'Hello World!'

# Run app  
if __name__ == '__main__':
    app.run(debug=True)


# #abort code:

# from flask import Flask, abort

# # Create Flask app
# app = Flask(__name__) 

# # Trigger 500 error
# @app.route('/error')  
# def error():
#     abort(500)