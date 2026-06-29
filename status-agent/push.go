package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"status-agent/stat"
)

const pushInterval = 3 * time.Second

var httpClient = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        4,
		MaxIdleConnsPerHost: 2,
		IdleConnTimeout:     90 * time.Second,
	},
}

func pushLoop() {
	url := strings.TrimRight(Config.Url, "/") + "/stats/update"
	log.Println("Active push mode")
	log.Println("Panel url:", url)
	log.Println("Server id:", Config.Sid)
	ticker := time.NewTicker(pushInterval)
	defer ticker.Stop()
	pushOnce(url)
	for range ticker.C {
		pushOnce(url)
	}
}

func pushOnce(url string) {
	data, err := stat.GetStat()
	if err != nil {
		return
	}
	body, err := json.Marshal(map[string]interface{}{
		"sid":  Config.Sid,
		"stat": data,
	})
	if err != nil {
		return
	}
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("key", Config.Key)
	resp, err := httpClient.Do(req)
	if err != nil {
		return
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
}