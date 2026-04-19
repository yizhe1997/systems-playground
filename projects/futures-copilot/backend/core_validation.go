package main

import "strings"

func validateAccountConfig(account AccountConfig) string {
	if strings.TrimSpace(account.Type) == "" {
		return "Missing account type"
	}
	if account.CurrentBalance <= 0 {
		return "Missing current balance"
	}
	if account.CurrentDailyStopLevel <= 0 {
		return "Missing daily stop level"
	}
	if account.CurrentMaxLossLevel <= 0 {
		return "Missing max loss level"
	}

	return ""
}

func validateRubric(rubric Rubric) string {
	if rubric.Name == "" || rubric.Rules == "" {
		return "Missing rubric fields"
	}

	return ""
}

func validateSyncUserRequest(req syncUserRequest) string {
	if req.ProviderID == "" || req.Email == "" {
		return "Missing user fields"
	}

	return ""
}

func validateDisableUserRequest(req disableUserRequest) string {
	if req.Email == "" {
		return "Missing email"
	}

	return ""
}

func validateAIProviderConfig(req updateAIProviderConfigRequest) string {
	if len(req.Features) == 0 {
		return "Missing features"
	}
	for _, f := range req.Features {
		if strings.TrimSpace(f.Provider) == "" {
			return "Missing provider for feature " + f.Key
		}
		if strings.TrimSpace(f.Model) == "" {
			return "Missing model for feature " + f.Key
		}
	}
	if req.TimeoutMs <= 0 {
		return "Invalid timeoutMs"
	}
	return ""
}
