export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-4 text-sm text-zinc-600">Placeholder login page — implement auth flow here.</p>
      <form className="mt-6 flex flex-col gap-3">
        <input className="border px-3 py-2" placeholder="Email" />
        <input className="border px-3 py-2" placeholder="Password" type="password" />
        <button className="mt-2 rounded bg-black px-4 py-2 text-white">Sign in</button>
      </form>
    </div>
  );
}
