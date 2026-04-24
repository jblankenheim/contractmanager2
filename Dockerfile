FROM public.ecr.aws/sam/build-python3.11:latest-x86_64

WORKDIR /var/task
RUN mkdir -p /opt/python /opt/bin /opt/lib

# Install Python packages
COPY requirements.txt .
RUN pip install -r requirements.txt -t /opt/python

# Download the ACTUAL zip file containing the binaries
RUN curl -L "https://github.com" -o layer.zip && \
    unzip layer.zip -d /opt && \
    rm layer.zip

# Create the final zip
CMD zip -r9 /var/task/layer.zip /opt
