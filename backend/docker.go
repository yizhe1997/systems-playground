package main

import (
	"context"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
)

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
		return "exited", nil
	} else {
		// If stopped, turn it on
		if err := cli.ContainerStart(ctx, id, types.ContainerStartOptions{}); err != nil {
			return "", err
		}
		return "running", nil
	}
}
