package com.whatsapp.Web.model;

import jakarta.persistence.*;

import java.util.Objects;


@Entity
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    private String full_name;
    private String email;
    private String profile_picture;
    private String password;

    public User() {

    }

    public User(String full_name, Integer id, String profile_picture, String email, String password) {
        super();
        this.full_name = full_name;
        this.id = id;
        this.profile_picture = profile_picture;
        this.email = email;
        this.password = password;

    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getFull_name() {
        return full_name;
    }

    public void setFull_name(String full_name) {
        this.full_name = full_name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getProfile_picture() {
        return profile_picture;
    }

    public void setProfile_picture(String profile_picture) {
        this.profile_picture = profile_picture;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id) && Objects.equals(full_name, user.full_name) && Objects.equals(email, user.email) && Objects.equals(profile_picture, user.profile_picture) && Objects.equals(password, user.password);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, full_name, email, profile_picture, password);
    }
}
