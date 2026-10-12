/** Edge case 1: catch empty or one-word inputs before any API call. Shared by the form and the API. */
export type InputErrors = { investor?: string; firm?: string };

const MAX = 80;

export function validateInputs(investor: unknown, firm: unknown): InputErrors {
  const errors: InputErrors = {};
  const name = typeof investor === "string" ? investor.trim() : "";
  const company = typeof firm === "string" ? firm.trim() : "";

  if (!name) errors.investor = "Enter the investor's name.";
  else if (name.split(/\s+/).length < 2) errors.investor = "Use their full name (first and last) so we find the right person.";
  else if (name.length > MAX || !/\p{L}/u.test(name)) errors.investor = "That doesn't look like a person's name.";

  if (!company) errors.firm = "Enter the firm they invest with.";
  else if (company.length < 2 || company.length > MAX || !/\p{L}/u.test(company)) errors.firm = "That doesn't look like a firm name.";

  return errors;
}

export function hasErrors(errors: InputErrors) {
  return Boolean(errors.investor || errors.firm);
}
