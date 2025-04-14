package main

import (
	"log"
	"net/http"
)

func main() {
	// Create a file server to serve files
	src_file_dir := http.Dir("../");
	file_server := http.FileServer(src_file_dir);

	// Handle all requests by serving files from the file server.
	http.Handle("/", file_server)

	// Start the server on port 8080.
	port := ":8080"
	log.Printf("Serving files on http://localhost%s", port)
	err := http.ListenAndServe(port, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
	return;
}
