package main

import (
	"flag"
	"fmt"
	"io/ioutil"
	"log"

	"status-agent/walled"

	"gopkg.in/yaml.v2"
)

var (
	Config CONF
)

func main() {
	var confpath string
	var show_version bool
	flag.StringVar(&confpath, "c", "", "config path")
	flag.StringVar(&Config.Sid, "sid", "", "server id")
	flag.StringVar(&Config.Key, "key", "", "access key")
	flag.StringVar(&Config.Url, "url", "", "panel url")
	flag.BoolVar(&show_version, "v", false, "show version")
	flag.Parse()

	if confpath != "" {
		data, err := ioutil.ReadFile(confpath)
		if err != nil {
			log.Panic(err)
		}
		err = yaml.Unmarshal([]byte(data), &Config)
		if err != nil {
			panic(err)
		}
	}
	if show_version {
		fmt.Println("status-agent v1.0")
		return
	}
	if Config.Sid == "" || Config.Key == "" || Config.Url == "" {
		log.Panic("sid, key and url are required")
	}
	go walled.MonitorWalled()
	pushLoop()
}