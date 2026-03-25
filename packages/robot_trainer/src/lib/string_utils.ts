

function toDashCase(str: string, randomSuffix = false): string {
    return (
        str
            // Replace an uppercase letter that follows a lowercase letter or digit with a dash and the letter
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            // Replace any spaces or underscores with a dash
            .replace(/[\s_]+/g, "-")
            // Ensure the entire string is lowercase
            .toLowerCase() + (randomSuffix ? `-${Math.random().toString(36).substr(2, 5)}` : "")
  );
}

export default toDashCase;