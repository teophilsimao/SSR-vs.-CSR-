# app/api/app.py
from flask import Flask, jsonify
from flask_cors import CORS
import plotly.express as px
import plotly
import json
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

@app.route('/api/plot', methods=['GET'])
def get_plot():

    df = pd.DataFrame({
        'x': [1, 2, 3, 4, 5, 6, 7],
        'y': [10, 11, 12, 13, 8, 15, 14],
        'size': [30, 50, 70, 40, 60, 55, 45],
        'category': ['A', 'B', 'C', 'A', 'B', 'C', 'A']
    })

    fig = px.scatter(
        df,
        x='x',
        y='y',
        size='size',
        color='category',
        title='Interactive Data Visualization',
        labels={'x': 'X axis', 'y': 'Y axis'},
        hover_data=['category']
    )

    fig.update_layout(
        legend_title="Categories",
        font=dict(size=14)
    )

    plot_json = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)

    return jsonify({'plot_data': plot_json})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=True, port=port)