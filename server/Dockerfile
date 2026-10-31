# PahaadPath report API. Build from the repository root:  docker build -f server/Dockerfile -t pahaadpath-api .
FROM python:3.12-slim
WORKDIR /app
COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt
COPY python/pahaadpath python/pahaadpath
COPY src/app.html src/app.html
COPY data/open_data.json data/nasa_glc_uttarakhand_bbox.json data/
COPY server/pahaadpath_api server/pahaadpath_api
RUN mkdir /data && chown nobody /data
ENV PYTHONPATH=/app/python:/app/server PORT=8080 PP_DATABASE_URL=sqlite:////data/reports.sqlite3
USER nobody
CMD ["sh", "-c", "uvicorn pahaadpath_api.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers"]
