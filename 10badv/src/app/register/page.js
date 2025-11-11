export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Register</h1>
      <p className="mt-4 text-sm text-zinc-600">Placeholder registration page — implement signup flow here.</p>
      <form className="mt-6 flex flex-col gap-3">
        <input className="border px-3 py-2" placeholder="Name" />
        <input className="border px-3 py-2" placeholder="Email" />
        <input className="border px-3 py-2" placeholder="Password" type="password" />
        <button className="mt-2 rounded bg-black px-4 py-2 text-white">Create account</button>
      </form>
    </div>
  );
}
