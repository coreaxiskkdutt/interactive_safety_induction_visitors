import os
import secrets
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))

REGISTRATIONS = {}

INDIAN_LANGUAGES = [
    {"code": "en", "name": "English", "native": "English"},
    {"code": "hi", "name": "Hindi", "native": "\u0939\u093f\u0928\u094d\u0926\u0940"},
    {"code": "bn", "name": "Bengali", "native": "\u09ac\u09be\u0982\u09b2\u09be"},
    {"code": "te", "name": "Telugu", "native": "\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41"},
    {"code": "mr", "name": "Marathi", "native": "\u092e\u0930\u093e\u0920\u0940"},
    {"code": "ta", "name": "Tamil", "native": "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd"},
    {"code": "ur", "name": "Urdu", "native": "\u0627\u0631\u062f\u0648"},
    {"code": "gu", "name": "Gujarati", "native": "\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0"},
    {"code": "kn", "name": "Kannada", "native": "\u0c95\u0ca8\u0ccd\u0ca8\u0ca1"},
    {"code": "ml", "name": "Malayalam", "native": "\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02"},
    {"code": "or", "name": "Odia", "native": "\u0b13\u0b21\u0b3f\u0b06"},
    {"code": "pa", "name": "Punjabi", "native": "\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40"},
    {"code": "as", "name": "Assamese", "native": "\u0985\u09b8\u09ae\u09c0\u09af\u09bc\u09be"},
    {"code": "mai", "name": "Maithili", "native": "\u092e\u0948\u0925\u093f\u0932\u0940"},
    {"code": "sat", "name": "Santali", "native": "\u1c65\u1c76\u1c64\u1c8b\u1c73"},
    {"code": "ks", "name": "Kashmiri", "native": "\u0915\u0949\u0936\u0941\u0930"},
    {"code": "ne", "name": "Nepali", "native": "\u0928\u0947\u092a\u093e\u0932\u0940"},
    {"code": "sd", "name": "Sindhi", "native": "\u0363\u0646\u068c\u064a"},
    {"code": "doi", "name": "Dogri", "native": "\u0921\u094b\u0917\u0930\u0940"},
    {"code": "kok", "name": "Konkani", "native": "\u0915\u094b\u0902\u0915\u0923\u0940"},
    {"code": "mni", "name": "Manipuri", "native": "\u09ae\u09c8\u0924\u0948\u0932\u094b\u0928\u094d"},
    {"code": "brx", "name": "Bodo", "native": "\u092c\u093c\u0930\u094b\u0921\u093c\u094b"},
]


@app.route("/")
def index():
    return render_template("index.html", languages=INDIAN_LANGUAGES)


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    name = data.get("name", "").strip()
    gov_id = data.get("gov_id", "").strip()
    language = data.get("language", "en")

    if not name:
        return jsonify({"error": "Name is required"}), 400
    if len(name) > 200:
        return jsonify({"error": "Name is too long"}), 400
    if not gov_id:
        return jsonify({"error": "Government ID is required"}), 400
    if len(gov_id) > 50:
        return jsonify({"error": "ID number is too long"}), 400

    valid_codes = {l["code"] for l in INDIAN_LANGUAGES}
    if language not in valid_codes:
        return jsonify({"error": "Invalid language selection"}), 400

    reg_id = str(uuid.uuid4())[:8].upper()
    REGISTRATIONS[reg_id] = {
        "name": name,
        "gov_id": gov_id,
        "language": language,
        "registered_at": datetime.now().isoformat(),
    }

    return jsonify({
        "success": True,
        "reg_id": reg_id,
        "name": name,
        "language": language,
    })


@app.route("/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
