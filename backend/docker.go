package main

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
)

var (
	activityMap = make(map[string]time.Time)
	activityMutex sync.Mutex
)

// RecordActivity resets the 10-minute idle timer for a container
func RecordActivity(id string) {
	activityMutex.Lock()
	defer activityMutex.Unlock()
	activityMap[id] = time.Now()
}

// StartReaper checks for idle playground widgets every minute and stops them if idle > 10m
func StartReaper() {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			activityMutex.Lock()
			now := time.Now()
			for id, lastActive := range activityMap {
				if now.Sub(lastActive) > 10*time.Minute {
					log.Printf("⏳ [Scale-to-Zero] Container %s has been idle for >10m. Shutting down.", id)
					toggleWidget(id) // stop it
					delete(activityMap, id)
				}
			}
			activityMutex.Unlock()
		}
	}()
}

type Widget struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Type   string `json:"type"`
	Status string `json:"status"`
}

func getDockerClient() (*client.Client, error) {
	// FromEnv automatically reads the DOCKER_HOST env var, 
	// which will use the /var/run/docker.sock we mapped in docker-compose
	return client.NewClientWithOpts(client.FromEnv, client.WithVersion("1.44"))
}

// listWidgets finds all containers with the label "playground.widget"
func listWidgets() ([]Widget, error) {
	cli, err := getDockerClient()
	if err != nil {
		return nil, err
	}
	defer cli.Close()

	f := filters.NewArgs()
	f.Add("label", "playground.widget")

	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{
		All:     true, // Include stopped containers so we can start them!
		Filters: f,
	})
	if err != nil {
		return nil, err
	}

	var widgets []Widget
	for _, c := range containers {
		name := c.Labels["playground.name"]
		if name == "" {
			name = c.Names[0]
		}
		widgets = append(widgets, Widget{
			ID:     c.ID[:12],
			Name:   name,
			Type:   c.Labels["playground.widget"],
			Status: c.State, // "running", "exited", etc.
		})
	}
	return widgets, nil
}

// toggleWidget starts a stopped container, or stops a running one
func toggleWidget(id string) (string, error) {
	cli, err := getDockerClient()
	if err != nil {
		return "", err
	}
	defer cli.Close()

	ctx := context.Background()
	c, err := cli.ContainerInspect(ctx, id)
	if err != nil {
		return "", err
	}

	if c.State.Running {
		// If running, turn it off
		if err := cli.ContainerStop(ctx, id, container.StopOptions{}); err != nil {
			return "", err
		}
		activityMutex.Lock()
		delete(activityMap, id)
		activityMutex.Unlock()
		return "exited", nil
	} else {
		// If stopped, turn it on
		if err := cli.ContainerStart(ctx, id, types.ContainerStartOptions{}); err != nil {
			return "", err
		}
		RecordActivity(id)
		return "running", nil
	}
}
