import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const useLocationTracker = () => {
    const { user } = useAuth();
    const watchIdRef = useRef(null);
    const lastUpdateRef = useRef(0);

    useEffect(() => {
        if (!user || (user.role !== 'agent' && user.role !== 'customer')) return;

        console.log("Starting Location Tracker for", user.role);

        const updateLocation = (lat, lng) => {
            const now = Date.now();
            // Throttle updates to every 30 seconds to save battery/bandwidth
            if (now - lastUpdateRef.current < 30000) return;

            const endpoint = user.role === 'agent' ? '/agents/location' : '/customers/location';

            client.post(endpoint, {
                id: user.id,
                lat,
                lng
            }).then(() => {
                // console.log("Location synced");
                lastUpdateRef.current = now;
            }).catch(err => console.error("Location sync failed", err));
        };

        if ('geolocation' in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    updateLocation(latitude, longitude);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 30000,
                    timeout: 27000
                }
            );
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [user]);
};

export default useLocationTracker;
