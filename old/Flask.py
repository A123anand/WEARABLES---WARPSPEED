#flask definitons and key terms: (directly from corseara duke course)
# Flask - A popular Python web framework used to build web applications. It handles routing requests and rendering responses.

# Route - The portion of a URL that determines which function will handle the request in a Flask application. Defined using the @app.route decorator.

# View function - The Python function that handles a request to a particular route. Returns the response.

# Response - What is returned after a route is handled. Can render HTML, JSON, etc.

# Error handling - Handling exceptions and generating error responses. Can use abort() to trigger error codes.

# Debug mode - Running Flask with debug=True. Prints debugging info and reloads code on changes. Not safe for production.
#notes:
#the port value defines the specific TCP networking port on which the development server listens for incoming HTTP requests
# How to Change Ports
# You can change the port in several ways:
# In Code: app.run(port=5001)
# Command Line: flask run --port 8000
# Environment Variable: export FLASK_RUN_PORT=8000
