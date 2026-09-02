import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ZipForm } from "./ZipForm";

describe("ZipForm validation", () => {
  it("blocks submit and shows an error for a short ZIP", () => {
    const onSubmit = vi.fn();
    render(<ZipForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^go$/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a 5-digit zip/i)).toBeInTheDocument();
  });

  it("strips non-digits and submits a valid 5-digit ZIP", () => {
    const onSubmit = vi.fn();
    render(<ZipForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/zip code/i), {
      target: { value: "7a5b2c0d1e" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^go$/i }));

    expect(onSubmit).toHaveBeenCalledWith("75201");
  });
});
