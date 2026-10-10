import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { LanguageProvider, useLanguage } from "@/components/language";

function Harness() {
  const { language, setLanguage } = useLanguage();
  const [value, setValue] = useState("");
  return <><input aria-label="input" value={value} onChange={e => setValue(e.target.value)} /><output data-testid="language">{language}</output><button onClick={() => setLanguage("hi")}>switch</button></>;
}

afterEach(() => { cleanup(); localStorage.clear(); });
describe("Public language preference", () => {
  it("defaults to English without a saved preference", () => {
    render(<LanguageProvider><Harness /></LanguageProvider>);
    expect(screen.getByTestId("language").textContent).toBe("en");
  });
  it("preserves entered form data during an instant language switch", () => {
    render(<LanguageProvider><Harness /></LanguageProvider>);
    fireEvent.change(screen.getByLabelText("input"), { target: { value: "BIN-0037" } });
    fireEvent.click(screen.getByText("switch"));
    expect(screen.getByTestId("language").textContent).toBe("hi");
    expect((screen.getByLabelText("input") as HTMLInputElement).value).toBe("BIN-0037");
  });
  it("remembers Hindi on a future visit", async () => {
    const initial = render(<LanguageProvider><Harness /></LanguageProvider>);
    fireEvent.click(screen.getByText("switch"));
    expect(localStorage.getItem("civictrace-language")).toBe("hi");
    initial.unmount();
    render(<LanguageProvider><Harness /></LanguageProvider>);
    await waitFor(() => expect(screen.getByTestId("language").textContent).toBe("hi"));
  });
});