import React from "react";
interface PasswordStrengthProps {
  password: string;
  darkMode: boolean;
}
export const PasswordStrength: React.FC<PasswordStrengthProps> = ({
  password,
  darkMode,
}) => {
  const calculateStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;
    return strength;
  };
  const strength = calculateStrength(password);
  const strengthText = ["Weak", "Fair", "Good", "Strong"][strength - 1] || "";
  const strengthColor =
    ["bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"][
      strength - 1
    ] || "bg-gray-200";
  return (
    <div className="mt-1">
      <div className="flex h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 ${i < strength ? strengthColor : darkMode ? "bg-gray-700" : "bg-gray-200"}`}
          />
        ))}
      </div>
      {password && (
        <p
          className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
        >
          Password Strength: {strengthText}
        </p>
      )}
    </div>
  );
};

export default PasswordStrength