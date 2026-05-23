package core

import "strings"

func ValidateAccountConfig(account AccountConfig) string {
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

func ValidateRubric(rubric Rubric) string {
	if rubric.Name == "" || rubric.Rules == "" {
		return "Missing rubric fields"
	}

	return ""
}

func ValidateInstrumentDefinition(instrument InstrumentDefinition) string {
	if strings.TrimSpace(instrument.Code) == "" {
		return "Missing instrument code"
	}

	return ""
}

func ValidateSyncUserRequest(req SyncUserRequest) string {
	if req.ProviderID == "" || req.Email == "" {
		return "Missing user fields"
	}

	return ""
}

func ValidateDisableUserRequest(req DisableUserRequest) string {
	if req.Email == "" {
		return "Missing email"
	}

	return ""
}

func ValidateAIProviderConfig(req UpdateAIProviderConfigRequest) string {
	if len(req.Features) == 0 {
		return "Missing features"
	}
	seenKeys := map[string]struct{}{}
	for _, f := range req.Features {
		key := strings.TrimSpace(f.Key)
		if key == "" {
			return "Missing feature key"
		}
		if _, exists := seenKeys[key]; exists {
			return "Duplicate feature key " + key
		}
		seenKeys[key] = struct{}{}
		if strings.TrimSpace(f.Provider) == "" {
			return "Missing provider for feature " + key
		}
		if strings.TrimSpace(f.Model) == "" {
			return "Missing model for feature " + key
		}
		if f.TimeoutMs <= 0 && req.TimeoutMs <= 0 {
			return "Missing timeoutMs for feature " + key
		}
	}
	return ""
}
