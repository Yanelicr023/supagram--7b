
useEffect(() => {
  let mounted = true;

  const getUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error("Error al verificar usuario:", error);
      if (mounted) setCurrentUserId(null);
      return;
    }

    if (mounted) {
      setCurrentUserId(data.user?.id ?? null);
    }
  };

  getUser();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (mounted) {
      setCurrentUserId(session?.user?.id ?? null);
    }
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);
