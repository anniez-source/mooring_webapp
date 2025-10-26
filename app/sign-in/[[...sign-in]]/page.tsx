import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <p className="text-sm text-gray-600 mb-4 text-center">
          Access restricted to approved users only
        </p>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto"
            }
          }}
          afterSignInUrl="/chat"
          routing="path"
          path="/sign-in"
        />
      </div>
    </div>
  );
}

