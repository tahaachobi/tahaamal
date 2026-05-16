type RoleOption = {
  description: string;
  label: string;
  value: "CLIENT" | "SALON_OWNER";
};

const roleOptions: RoleOption[] = [
  {
    value: "SALON_OWNER",
    label: "Salon owner",
    description: "Open the studio dashboard after sign-in and manage bookings.",
  },
  {
    value: "CLIENT",
    label: "Client",
    description: "Track reservations, confirmations, and salon contact actions.",
  },
];

type RoleSelectorProps = {
  onChange: (value: "CLIENT" | "SALON_OWNER") => void;
  value: "CLIENT" | "SALON_OWNER";
};

export function RoleSelector({ onChange, value }: RoleSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-[#152235]">Account type</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {roleOptions.map((option) => {
          const selected = value === option.value;

          return (
            <label
              className={`flex cursor-pointer flex-col rounded-[1.2rem] border px-4 py-4 transition ${
                selected
                  ? "border-[#183445] bg-[#183445] text-white shadow-[0_18px_35px_rgba(24,52,69,0.18)]"
                  : "border-[#dce6f4] bg-[#f8fbff] text-[#152235] hover:border-[#a9c0df] hover:bg-white"
              }`}
              key={option.value}
            >
              <input
                checked={selected}
                className="sr-only"
                name="role"
                onChange={() => onChange(option.value)}
                type="radio"
                value={option.value}
              />
              <span className="text-sm font-semibold">{option.label}</span>
              <span
                className={`mt-2 text-sm leading-6 ${
                  selected ? "text-white/82" : "text-[#607086]"
                }`}
              >
                {option.description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
