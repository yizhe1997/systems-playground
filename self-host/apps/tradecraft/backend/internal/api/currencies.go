package api

import (
	"slices"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// The active ISO 4217 three-letter codes. An account's currency is a label only; nothing is converted.
var currencyCodes = strings.Fields(`
AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP
CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF
IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD
MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB
RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD
UYU UZS VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW ZWG`)

func validCurrency(code string) bool { return slices.Contains(currencyCodes, code) }

// listCurrencies answers the allowed codes, USD first, so the web tier has one source for its chooser.
func (s *Server) listCurrencies(c *fiber.Ctx) error {
	out := []string{"USD"}
	for _, code := range currencyCodes {
		if code != "USD" {
			out = append(out, code)
		}
	}
	return c.JSON(out)
}
