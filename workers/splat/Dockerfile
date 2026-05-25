FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y ffmpeg python3 python3-pip git && rm -rf /var/lib/apt/lists/*

RUN pip3 install nerfstudio

WORKDIR /worker
COPY process.sh .
RUN chmod +x process.sh

ENTRYPOINT ["./process.sh"]
