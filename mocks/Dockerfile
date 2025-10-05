FROM wiremock/wiremock:latest

# Copy mapping and response files
COPY mappings /home/wiremock/mappings
COPY __files /home/wiremock/__files

# Expose the default WireMock port
EXPOSE 8080

# Run WireMock with verbose logging
CMD ["--verbose", "--global-response-templating"]