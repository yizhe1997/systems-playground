package main

func validateAccountConfig(account AccountConfig) string {
	if account.Type == "" {
		return "Missing account type"
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
